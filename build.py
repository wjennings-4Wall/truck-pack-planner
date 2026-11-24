"""Build dist/index.html: one self-contained page from src/ templates."""
import base64, pathlib
root = pathlib.Path(__file__).parent
src = (root / 'src' / 'app.html').read_text()
logo = 'data:image/png;base64,' + base64.b64encode((root / 'assets' / '4wall-logo-horizontal.png').read_bytes()).decode()
engine = (root / 'src' / 'engine.js').read_text().replace("if (typeof module !== 'undefined') module.exports = { packTruck };", '')
out = (src.replace('/*@ENGINE@*/', engine)
          .replace('/*@VIEWER@*/', (root / 'src' / 'viewer.js').read_text())
          .replace('@LOGO@', logo)
          .replace('@THREE@', 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js')
          .replace('@ORBIT@', 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js')
          .replace('@JSPDF@', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'))
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'index.html').write_text(out)
print('Built dist/index.html', len(out), 'bytes')
