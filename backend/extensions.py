from flask import Flask, request

from utils.cors_helpers import apply_cors_headers, is_origin_allowed


def init_cors(app: Flask) -> None:
    """CORS: flask-cors callable origins desteklemediği için manuel handler kullanıyoruz."""

    @app.before_request
    def handle_preflight():
        if request.method != "OPTIONS":
            return None
        origin = request.headers.get("Origin")
        if not is_origin_allowed(origin):
            return None
        response = app.make_response("", 204)
        return apply_cors_headers(response, origin)

    @app.after_request
    def add_cors_headers(response):
        if response.headers.get("Access-Control-Allow-Origin"):
            return response
        return apply_cors_headers(response, request.headers.get("Origin"))
