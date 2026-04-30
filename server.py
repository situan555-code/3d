import http.server
import socketserver

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/log':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            with open('/tmp/test_logs.txt', 'w') as f:
                f.write(post_data.decode('utf-8'))
            self.send_response(200)
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(("", 8081), Handler) as httpd:
    httpd.serve_forever()
