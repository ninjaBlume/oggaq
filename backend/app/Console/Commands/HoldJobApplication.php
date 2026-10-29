<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HoldJobApplication extends Command
{
    protected $signature = 'privacy:hold-application {application : Başvuru UUID} {until : YYYY-MM-DD veya release}';

    protected $description = 'Belgelenmiş bir uyuşmazlık için başvuru imhasını süreli erteler veya ertelemeyi kaldırır';

    public function handle(): int
    {
        $id = $this->argument('application');
        $date = $this->argument('until');
        if (! Str::isUuid($id) || ($date !== 'release' && ! preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $date))) {
            $this->error('Geçerli UUID ve YYYY-MM-DD tarihi veya release gerekli.');

            return self::FAILURE;
        }
        try {
            $until = $date === 'release' ? null : Carbon::createFromFormat('!Y-m-d', $date)->endOfDay();
        } catch (\Exception) {
            $until = false;
        }
        if ($until === false || ($until !== null && ($until->format('Y-m-d') !== $date || $until->isPast() || $until->greaterThan(now()->addYear())))) {
            $this->error('Erteleme tarihi gelecekte ve en çok bir yıl içinde olmalı.');

            return self::FAILURE;
        }
        $changed = DB::transaction(function () use ($id, $until) {
            $row = DB::table('job_applications')->where('id', $id)->lockForUpdate()->first();
            if (! $row) {
                return false;
            }
            DB::table('job_applications')->where('id', $id)->update(['retention_hold_until' => $until]);
            DB::table('audit_events')->insert(['id' => (string) Str::uuid(), 'actor_id' => null, 'tenant_id' => null,
                'target_id' => $id, 'action' => $until === null ? 'privacy.hold_released' : 'privacy.hold_set', 'created_at' => now()]);

            return true;
        });
        $changed ? $this->info('İmha ertelemesi güncellendi; gerekçe erişimi kısıtlı işlem dosyasında tutulmalıdır.') : $this->error('Başvuru bulunamadı.');

        return $changed ? self::SUCCESS : self::FAILURE;
    }
}
