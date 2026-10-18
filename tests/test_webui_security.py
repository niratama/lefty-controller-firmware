import unittest
import os
import re
import json
import subprocess
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WEBUI_HTML = os.path.join(PROJECT_ROOT, "webui", "index.html")
WEBUI_JS = os.path.join(PROJECT_ROOT, "webui", "app.js")
BOOT_PY = os.path.join(PROJECT_ROOT, "firmware", "boot.py")


class TestWebuiAndBootSecurity(unittest.TestCase):
    def test_index_html_has_csp_and_no_inline_event_handlers(self):
        with open(WEBUI_HTML, "r", encoding="utf-8") as f:
            html = f.read()

        # Content-Security-Policy メタタグが定義されていること
        self.assertIn('http-equiv="Content-Security-Policy"', html)
        self.assertIn("default-src 'self'", html)
        self.assertIn("script-src 'self'", html)

        # HTML内にインラインイベントハンドラ (onclick= 等) が存在しないこと
        inline_handlers = re.findall(r"\bon(?:click|load|error|mouseover|focus)\s*=", html, re.IGNORECASE)
        self.assertEqual(inline_handlers, [])

    def test_app_js_no_inline_onclick_in_templates(self):
        with open(WEBUI_JS, "r", encoding="utf-8") as f:
            js = f.read()

        # innerHTML テンプレート内に onclick="..." 等のインラインハンドラが残っていないこと
        self.assertNotRegex(js, r"\bonclick\s*=")

    def test_boot_py_disables_autoreload_in_normal_mode(self):
        with open(BOOT_PY, "r", encoding="utf-8") as f:
            boot_code = f.read()

        # 通常運用モード (not is_maintenance) で autoreload = False が設定されていること
        self.assertIn("supervisor.runtime.autoreload = False", boot_code)

    def test_webui_js_logic_and_security_via_node(self):
        """Node.js VM上で webui/app.js のコア関数・セキュリティ防御ロジックを検証"""
        node_script = r"""
const fs = require('fs');
const vm = require('vm');
const zlib = require('zlib');

const code = fs.readFileSync(process.argv[1], 'utf8');

function createDummyEl() {
  return {
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){},
    removeEventListener(){},
    appendChild(){},
    querySelector(){ return createDummyEl(); },
    querySelectorAll(){ return []; },
    getContext(){
      return {
        clearRect(){}, beginPath(){}, arc(){}, stroke(){}, fill(){},
        moveTo(){}, lineTo(){}, fillText(){}, strokeRect(){}, fillRect(){},
        setLineDash(){}
      };
    },
    setAttribute(){},
    getAttribute(){ return null; },
    closest(){ return null; },
    innerHTML: '',
    textContent: '',
    value: ''
  };
}

const storageMap = new Map();
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  ArrayBuffer,
  DataView,
  CompressionStream: require('stream/web').CompressionStream,
  DecompressionStream: require('stream/web').DecompressionStream,
  Response,
  Blob,
  URL,
  URLSearchParams,
  btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
  atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
  localStorage: {
    getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  },
  navigator: { serial: null },
  location: { search: '', pathname: '/', origin: 'http://localhost', href: 'http://localhost/' },
  history: { replaceState(){} },
  document: {
    getElementById: () => createDummyEl(),
    querySelector: () => createDummyEl(),
    querySelectorAll: () => [],
    createElement: () => createDummyEl(),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: createDummyEl()
  },
  window: null
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

(async () => {
  // 1. escapeHtml の検証
  const escaped = sandbox.escapeHtml('<img src=x onerror="alert(1)">&\'\n');
  if (escaped !== '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#039;\n') {
    throw new Error('escapeHtml failed: ' + escaped);
  }

  // 2. ensureProfiles の不完全データ修復検証 (directions欠損・不正型でもクラッシュしないこと)
  const brokenCfg = {
    active_profile: 0,
    pins: { buttons: [99] },
    profiles: [
      {
        name: 'Broken Profile',
        keymap: { buttons: ['A'] },
        joystick: { directions: { up: null, down: 'invalid' } }
      }
    ]
  };
  const fixed = sandbox.ensureProfiles(brokenCfg);
  if ('pins' in fixed) throw new Error('sanitizeConfig did not strip pins');
  if (fixed.profiles[0].keymap.buttons.length !== 13) throw new Error('buttons not padded to 13');
  for (const dir of ['up', 'down', 'left', 'right']) {
    const d = fixed.profiles[0].joystick.directions[dir];
    if (!d || typeof d.th_walk !== 'number' || typeof d.th_run !== 'number') {
      throw new Error('direction not repaired: ' + dir);
    }
  }

  // 3. 共有URLの圧縮・展開ラウンドトリップ検証
  const sampleProfile = fixed.profiles[0];
  const shareUrlStr = await sandbox.compressProfileToUrl(sampleProfile);
  const shareParam = new URL(shareUrlStr).searchParams.get('profile');
  const decoded = await sandbox.decompressProfileFromUrl(shareParam);
  if (decoded.name !== 'Broken Profile') {
    throw new Error('roundtrip profile name mismatch: ' + decoded.name);
  }

  // 4. Deflate Decompression Bomb (64KB超) の拒否検証
  const hugeJson = JSON.stringify({ name: 'Bomb', padding: 'A'.repeat(100000) });
  const compressedBomb = zlib.deflateRawSync(Buffer.from(hugeJson, 'utf8'));
  const b64urlBomb = compressedBomb.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  let bombRejected = false;
  try {
    await sandbox.decompressProfileFromUrl(b64urlBomb);
  } catch (err) {
    bombRejected = true;
  }
  if (!bombRejected) {
    throw new Error('Decompression bomb (>64KB) was not rejected!');
  }

  // 5. getDependentProfileIds の連鎖追跡検証
  const profs = [
    { id: 'p1', name: 'P1', keymap: { buttons: ['profile_switch:p2'] } },
    { id: 'p2', name: 'P2', keymap: { combos: [{ buttons: [0, 1], action: 'profile_switch:p3' }] } },
    { id: 'p3', name: 'P3', keymap: { buttons: ['A'] } },
    { id: 'p4', name: 'P4', keymap: { buttons: ['B'] } }
  ];
  const deps = sandbox.getDependentProfileIds(profs[0], profs);
  if (!deps.has('p2') || !deps.has('p3') || deps.has('p4')) {
    throw new Error('getDependentProfileIds failed: ' + JSON.stringify([...deps]));
  }

  console.log('ALL_WEBUI_TESTS_OK');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
"""
        proc = subprocess.run(
            ["node", "-e", node_script, WEBUI_JS],
            capture_output=True,
            text=True,
            timeout=10
        )
        self.assertEqual(proc.returncode, 0, f"Node test failed:\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}")
        self.assertIn("ALL_WEBUI_TESTS_OK", proc.stdout)


if __name__ == "__main__":
    unittest.main()
