# -*- coding: utf-8 -*-
import http.server
import socketserver
import webbrowser
import threading
import time
import socket
import os

PORT = 8000
HOST = "localhost"

def find_free_port(start_port=8000):
    """사용 가능한 포트를 찾습니다."""
    port = start_port
    while port < 9000:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((HOST, port))
                return port
            except socket.error:
                port += 1
    return start_port

def open_browser(url):
    """잠시 대기 후 웹 브라우저를 엽니다."""
    time.sleep(1.0)
    print(f"\n[알림] 브라우저에서 자동으로 사이트를 엽니다: {url}")
    webbrowser.open(url)

class CADViewerHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # 1. API Endpoint: List all relevant drawing/CAD/media files in workspace
        if self.path == '/api/list_files':
            import json
            
            skip_dirs = {'.claude', '.cursor', '.github', '.vibecheck', '.git', '__pycache__', 'node_modules', 'mcp-client-python', 'mcp-server-python', 'hex_wooden_greenhouse_package'}
            allowed_exts = {
                '.jpg', '.jpeg', '.png', '.gif', '.dxf', '.dwg', '.stl', '.obj', 
                '.max', '.mb', '.ma', '.catpart', '.catproduct', '.art', '.pz3', '.psd', '.ai', '.pdf'
            }
            
            files_tree = []
            
            for root, dirs, files in os.walk('.'):
                # Skip system/ignored directories
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                
                for file in files:
                    name, ext = os.path.splitext(file)
                    ext = ext.lower()
                    if ext in allowed_exts:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, '.')
                        rel_path_web = rel_path.replace('\\', '/')
                        
                        try:
                            size = os.path.getsize(full_path)
                            mtime = os.path.getmtime(full_path)
                        except Exception:
                            size = 0
                            mtime = 0
                            
                        files_tree.append({
                            "name": file,
                            "path": rel_path_web,
                            "size": size,
                            "mtime": mtime,
                            "ext": ext[1:] # strip dot
                        })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            self.wfile.write(json.dumps(files_tree, ensure_ascii=False).encode('utf-8'))
            return
            
        # 2. API Endpoint: Open a file in its native application on Windows
        elif self.path.startswith('/api/open_file'):
            from urllib.parse import urlparse, parse_qs, unquote
            import json
            
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            file_path = query_params.get('path', [None])[0]
            
            if file_path:
                file_path = unquote(file_path)
                
            abs_workspace = os.path.abspath('.')
            abs_target = os.path.abspath(file_path) if file_path else ''
            
            response = {}
            if file_path and os.path.exists(file_path) and abs_target.startswith(abs_workspace):
                try:
                    # Windows native associated application run
                    os.startfile(abs_target)
                    response = {"status": "success", "message": f"성공적으로 파일을 실행했습니다: {os.path.basename(file_path)}"}
                except Exception as e:
                    response = {"status": "error", "message": f"실행 실패: {str(e)}"}
            else:
                response = {"status": "error", "message": "파일을 찾을 수 없거나 접근 권한이 없습니다."}
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            return
            
        # Fallback to serving static files
        return super().do_GET()

def run_server():
    # 스크립트 파일이 위치한 디렉토리로 작업 디렉토리 변경
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir:
        os.chdir(script_dir)

    port = find_free_port(PORT)
    url = f"http://{HOST}:{port}/"
    
    # HTML 파일 존재 확인
    if not os.path.exists("index.html"):
        print("[오류] index.html 파일을 찾을 수 없습니다. 올바른 경로에서 실행하세요.")
        return

    handler = CADViewerHTTPRequestHandler
    
    # MIME 타입 추가 등록 (CAD/3D 포맷 및 일반 문서 등 등록)
    handler.extensions_map.update({
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.md': 'text/plain; charset=utf-8',
        '.csv': 'text/csv; charset=utf-8',
        '.dxf': 'text/plain; charset=utf-8',
        '.dwg': 'application/octet-stream',
        '.stl': 'application/octet-stream',
        '.obj': 'text/plain; charset=utf-8',
        '.max': 'application/octet-stream',
        '.mb': 'application/octet-stream',
        '.ma': 'text/plain; charset=utf-8',
        '.art': 'application/octet-stream',
        '.pz3': 'text/plain; charset=utf-8',
        '.psd': 'image/vnd.adobe.photoshop',
        '.ai': 'application/pdf', # AI can be rendered as PDF if compatible
        '.pdf': 'application/pdf',
    })

    print("==================================================")
    print("      OmniCAD & Media 로컬 웹 서버 환경 구성")
    print("==================================================")
    print(f"  - 서버 주소: {url}")
    print(f"  - 작업 디렉토리: {os.getcwd()}")
    print("  - 종료하려면 터미널에서 Ctrl+C를 누르세요.")
    print("==================================================")

    # 브라우저 자동 실행 스레드 시작
    threading.Thread(target=open_browser, args=(url,), daemon=True).start()

    # 서버 바인딩 및 시작
    with socketserver.TCPServer((HOST, port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[알림] 웹 서버가 사용자에 의해 종료되었습니다.")

if __name__ == "__main__":
    run_server()
