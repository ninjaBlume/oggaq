"""Regression checks for native empty POSTs and bounded preview requests."""
import io
import unittest
from email.message import Message

from preview_http_body import BodyError, read_body


def decode(body, fields=()):
    headers = Message()
    for name, value in fields:
        headers[name] = value
    return read_body(headers, io.BytesIO(body))


class PreviewBodyTest(unittest.TestCase):
    def test_empty_native_chunked_post(self):
        self.assertEqual(decode(b'0\r\n\r\n', [('Transfer-Encoding', 'chunked')]), b'')

    def test_chunked_json_and_extensions(self):
        self.assertEqual(decode(b'1;ext=value\r\n{\r\n1\r\n}\r\n0\r\n\r\n',
                                [('Transfer-Encoding', 'Chunked')]), b'{}')

    def test_ignores_bounded_trailers(self):
        self.assertEqual(decode(b'0\r\nX-Example: value\r\n\r\n',
                                [('Transfer-Encoding', 'chunked')]), b'')

    def test_content_length_and_absent_body(self):
        self.assertEqual(decode(b'{}', [('Content-Length', '2')]), b'{}')
        self.assertEqual(decode(b''), b'')

    def test_size_limit_for_both_framings(self):
        payload = b'x' * 65536
        self.assertEqual(decode(payload, [('Content-Length', '65536')]), payload)
        self.assertEqual(decode(b'10000\r\n' + payload + b'\r\n0\r\n\r\n',
                                [('Transfer-Encoding', 'chunked')]), payload)
        for body, fields in [
            (b'', [('Content-Length', '65537')]),
            (b'10001\r\n', [('Transfer-Encoding', 'chunked')]),
            (b'8000\r\n' + b'x' * 32768 + b'\r\n8001\r\n', [('Transfer-Encoding', 'chunked')]),
        ]:
            with self.subTest(fields=fields), self.assertRaises(BodyError) as error:
                decode(body, fields)
            self.assertEqual(error.exception.status, 413)

    def test_rejects_ambiguous_or_unsupported_framing(self):
        for fields in [
            [('Transfer-Encoding', 'chunked'), ('Content-Length', '0')],
            [('Transfer-Encoding', 'gzip, chunked')],
            [('Transfer-Encoding', 'chunked'), ('Transfer-Encoding', 'chunked')],
            [('Content-Length', '0'), ('Content-Length', '0')],
            [('Content-Length', '-1')],
            [('Content-Length', 'invalid')],
        ]:
            with self.subTest(fields=fields), self.assertRaises(BodyError) as error:
                decode(b'', fields)
            self.assertEqual(error.exception.status, 400)

    def test_rejects_incomplete_or_malformed_chunks(self):
        for body in [b'', b'zz\r\n', b'1\n', b'2\r\nx', b'1\r\nxZZ',
                     b'0\r\n', b'0\r\ninvalid\r\n\r\n', b'0\r\n' + b'x' * 1025,
                     b'f' * 129 + b'\r\n']:
            with self.subTest(body=body), self.assertRaises(BodyError) as error:
                decode(body, [('Transfer-Encoding', 'chunked')])
            self.assertEqual(error.exception.status, 400)

    def test_rejects_incomplete_content_length(self):
        with self.assertRaises(BodyError) as error:
            decode(b'x', [('Content-Length', '2')])
        self.assertEqual(error.exception.status, 400)

    def test_bounds_chunk_and_trailer_counts(self):
        for body, expected in [
            (b'1\r\nx\r\n' * 4096 + b'0\r\n\r\n', 413),
            (b'0\r\n' + b'X: value\r\n' * 16 + b'\r\n', 400),
        ]:
            with self.subTest(expected=expected), self.assertRaises(BodyError) as error:
                decode(body, [('Transfer-Encoding', 'chunked')])
            self.assertEqual(error.exception.status, expected)


if __name__ == '__main__':
    unittest.main()
