"""Bounded HTTP request decoding for the temporary mobile preview gateway."""
import re


class BodyError(Exception):
    def __init__(self, status):
        self.status = status


def read_body(headers, stream):
    lengths = headers.get_all('Content-Length', [])
    encodings = headers.get_all('Transfer-Encoding', [])
    if len(lengths) > 1 or len(encodings) > 1 or (lengths and encodings):
        raise BodyError(400)
    if encodings:
        if encodings[0].strip().lower() != 'chunked':
            raise BodyError(400)
        body = bytearray()
        for _ in range(4096):
            line = stream.readline(129)
            if len(line) > 128 or not line.endswith(b'\r\n'):
                raise BodyError(400)
            size_text = line[:-2].split(b';', 1)[0]
            if not re.fullmatch(rb'[0-9a-fA-F]{1,16}', size_text):
                raise BodyError(400)
            size = int(size_text, 16)
            if len(body) + size > 65536:
                raise BodyError(413)
            if size == 0:
                for _ in range(16):
                    trailer = stream.readline(1025)
                    if trailer == b'\r\n':
                        return bytes(body)
                    if len(trailer) > 1024 or not trailer.endswith(b'\r\n') or b':' not in trailer:
                        raise BodyError(400)
                raise BodyError(400)
            chunk = stream.read(size)
            if len(chunk) != size or stream.read(2) != b'\r\n':
                raise BodyError(400)
            body.extend(chunk)
        raise BodyError(413)
    size_text = lengths[0].strip() if lengths else '0'
    if not re.fullmatch(r'[0-9]+', size_text):
        raise BodyError(400)
    if len(size_text) > 16 or int(size_text) > 65536:
        raise BodyError(413)
    size = int(size_text)
    body = stream.read(size)
    if len(body) != size:
        raise BodyError(400)
    return body

