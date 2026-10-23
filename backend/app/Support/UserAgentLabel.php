<?php

namespace App\Support;

// A short human label for a browser session ("Chrome · macOS"); the raw user agent is never stored or shown.
class UserAgentLabel
{
    public static function describe(?string $userAgent): string
    {
        if (! is_string($userAgent) || $userAgent === '') {
            return 'Tarayıcı';
        }
        $browser = match (true) {
            (bool) preg_match('~Edg(e|A|iOS)?/~', $userAgent) => 'Edge',
            (bool) preg_match('~OPR/|Opera~', $userAgent) => 'Opera',
            (bool) preg_match('~Firefox/|FxiOS/~', $userAgent) => 'Firefox',
            (bool) preg_match('~Chrome/|CriOS/~', $userAgent) => 'Chrome',
            (bool) preg_match('~Safari/~', $userAgent) => 'Safari',
            default => 'Tarayıcı',
        };
        $system = match (true) {
            (bool) preg_match('~Android~', $userAgent) => 'Android',
            (bool) preg_match('~iPhone|iPad|iPod~', $userAgent) => 'iOS',
            (bool) preg_match('~Windows~', $userAgent) => 'Windows',
            (bool) preg_match('~Mac OS X|Macintosh~', $userAgent) => 'macOS',
            (bool) preg_match('~Linux|X11~', $userAgent) => 'Linux',
            default => null,
        };

        return $system === null ? $browser : $browser.' · '.$system;
    }
}
