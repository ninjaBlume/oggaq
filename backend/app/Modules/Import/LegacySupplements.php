<?php

namespace App\Modules\Import;

// Questions that are missing from the legacy dump but appear in the official EGM answered booklets of the same exam.
// Each entry completes the weapon section of an armed exam; the correct option is the one printed in red in the booklet.
// They are added to the exam only when the dump itself does not reach the required number of weapon questions.
class LegacySupplements
{
    public const QUESTIONS = [
        'egm-118-silah-19' => [
            'exam' => 118, 'subject' => 'silah-bilgisi-ve-atis',
            'stem' => 'Atış esnasında iğne kapsüle çok hafif vurmuş veya hiç çarpmamışsa tabancada hangi arıza vardır?',
            'options' => ['Fişek nemli ortamda bırakılmıştır', 'Kapsül içinde yanıcı madde yoktur', 'İğne standarttan uzundur', 'İğne yayı arızalıdır', 'Kapsülün kapsül yuvasından yüksekte bulunması'],
            'correct' => 4,
            'evidence' => 'EGM 118. Temel Eğitim A grubu cevaplı kitapçığı, soru 19 (silah bölümü): doğru şık D.',
        ],
        'egm-120-silah-23' => [
            'exam' => 120, 'subject' => 'silah-bilgisi-ve-atis',
            'stem' => 'Aşağıdakilerden hangisi yanlıştır?',
            'options' => [
                'Fişek çekirdeğinin namlu içerisinde kendi etrafında bir tur dönüş esnasında aldığı mesafeye hatve denir',
                'Fişek yatağına fişeğin geçerken tırmandığı bölüme rayyür denir',
                'Yarı otomatik tabancada şarjör yuvası bulunur',
                'Yarı otomatik tabancada kovan atma boşluğu sürgü üzerinde bulunur',
                'Toplu tabancalarda şarjör yuvası bulunmaz',
            ],
            'correct' => 2,
            'evidence' => 'EGM 120. Temel Eğitim A grubu cevaplı kitapçığı, soru 23 (silah bölümü): doğru şık B.',
        ],
        'egm-120-silah-24' => [
            'exam' => 120, 'subject' => 'silah-bilgisi-ve-atis',
            'stem' => 'Aşağıdakilerden hangisi ateşli silah türleriyle ilgili yanlış bir bilgidir?',
            'options' => [
                'Tek atışlı silahlarda her atışta fişek elle yerleştirilir',
                'Toplu silahlarda silindir fişek yatağı görevini görür',
                'Makineli silahlar yarı veya tam otomatik olabilir',
                'Yarı otomatik silahlarda tetiğe basılı tutulunca tüm fişekler atılır',
                'Tam otomatik silahlarda sürekli atış yapılabilir',
            ],
            'correct' => 4,
            'evidence' => 'EGM 120. Temel Eğitim A grubu cevaplı kitapçığı, soru 24 (silah bölümü): doğru şık D.',
        ],
        'egm-120-silah-25' => [
            'exam' => 120, 'subject' => 'silah-bilgisi-ve-atis',
            'stem' => 'Aşağıdakilerden hangisi, namlu içindeki yiv ve setlerin görevlerinden biri değildir?',
            'options' => [
                'Çekirdeğe kendi ekseni etrafında dönüş vermek',
                'Atış menzilini artırmak',
                'Çekirdeğin hedefe uç kısmıyla ulaşmasını sağlamak',
                'Delme gücünü artırmak',
                'Fişeğin ateşlenmesini sağlamak',
            ],
            'correct' => 5,
            'evidence' => 'EGM 120. Temel Eğitim A grubu cevaplı kitapçığı, soru 25 (silah bölümü): doğru şık E.',
        ],
    ];
}
