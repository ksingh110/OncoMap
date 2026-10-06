"""Bounded upload buffers that never roll over to filesystem storage."""
from io import BytesIO

from flask import Request
from werkzeug.exceptions import RequestEntityTooLarge

MAX_FILE_BYTES = 4 * 1024 * 1024
MAX_REQUEST_BYTES = MAX_FILE_BYTES + 64 * 1024


class MemoryUpload(BytesIO):
    def write(self, data):
        if self.tell() + len(data) > MAX_FILE_BYTES:
            raise RequestEntityTooLarge()
        return super().write(data)

    def close(self):
        # Best-effort overwrite of this mutable buffer; Python/parser/model copies
        # cannot be guaranteed erased by a garbage-collected runtime.
        if not self.closed:
            view = self.getbuffer()
            try:
                view[:] = b"\x00" * len(view)
            finally:
                view.release()
            super().close()


class MemoryOnlyRequest(Request):
    def _get_file_stream(self, total_content_length, content_type, filename=None, content_length=None):
        stream = MemoryUpload()
        self.__dict__.setdefault("_upload_streams", []).append(stream)
        return stream

    def close(self):
        try:
            super().close()
        finally:
            # Also close partial uploads when multipart parsing fails.
            for stream in self.__dict__.pop("_upload_streams", []):
                stream.close()
