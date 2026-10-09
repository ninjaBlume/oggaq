<?php

return [
    'required' => ':attribute alanı zorunludur.',
    'string' => ':attribute metin olmalıdır.',
    'email' => 'Geçerli bir e-posta adresi yazın.',
    'unique' => ':attribute zaten kullanılıyor.',
    'uuid' => ':attribute geçerli bir UUID olmalıdır.',
    'exists' => 'Seçilen :attribute geçerli değil.',
    'confirmed' => 'Parola tekrarı eşleşmiyor.',
    'prohibited' => ':attribute bu işlemle değiştirilemez.',
    'regex' => ':attribute biçimi geçerli değil.',
    'integer' => ':attribute tam sayı olmalıdır.',
    'in' => 'Seçilen :attribute geçerli değil.',
    'max' => ['string' => ':attribute en fazla :max karakter olabilir.', 'numeric' => ':attribute en fazla :max olabilir.'],
    'min' => ['string' => ':attribute en az :min karakter olmalıdır.', 'numeric' => ':attribute en az :min olmalıdır.'],
    'password' => ['letters' => 'Parola harf içermelidir.', 'mixed' => 'Parola büyük ve küçük harf içermelidir.',
        'numbers' => 'Parola rakam içermelidir.', 'symbols' => 'Parola sembol içermelidir.'],
    'attributes' => ['name' => 'Ad', 'email' => 'E-posta', 'password' => 'Parola', 'per_page' => 'Sayfa boyutu'],
];
