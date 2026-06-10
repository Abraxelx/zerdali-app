from flask import jsonify


class APIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def error_response(message: str, status_code: int = 400):
    return jsonify({"error": message}), status_code


def register_error_handlers(app):
    @app.errorhandler(APIError)
    def handle_api_error(err: APIError):
        return error_response(err.message, err.status_code)

    @app.errorhandler(404)
    def handle_not_found(_err):
        return error_response("Not found", 404)

    @app.errorhandler(422)
    def handle_unprocessable(_err):
        return error_response("Unprocessable entity", 422)

    @app.errorhandler(500)
    def handle_internal(_err):
        return error_response("Internal server error", 500)
