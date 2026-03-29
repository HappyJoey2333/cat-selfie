import ssl
import http.server
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('cert.pem', 'key.pem')

server = http.server.HTTPServer(('0.0.0.0', 3000), http.server.SimpleHTTPRequestHandler)
server.socket = context.wrap_socket(server.socket, server_side=True)
print("HTTPS server running at https://192.168.1.43:3000")
server.serve_forever()
