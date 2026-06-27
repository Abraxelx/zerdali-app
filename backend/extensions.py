from flask import Flask, request
from flask_cors import CORS

from utils.cors_helpers import CORS_ALLOW_HEADERS, CORS_ALLOW_METHODS, apply_cors_headers, is_origin_allowed


def init_cors(app: Flask) -> None:
    CORS(
        app,
        resources={r"/*": {"origins": is_origin_allowed}},
        supports_credentials=True,
        allow_headers=CORS_ALLOW_HEADERS.split(", "),
        expose_headers=["Content-Type"],
        methods=CORS_ALLOW_METHODS.split(", "),
        max_age=86400,
    )

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
        """Ensure CORS headers on error responses too."""
        if response.headers.get("Access-Control-Allow-Origin"):
            return response
        return apply_cors_headers(response, request.headers.get("Origin"))
