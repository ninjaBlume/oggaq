<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Tenancy\Models\StudyContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreatePlatformAdmin extends Command
{
    protected $signature = 'app:create-admin {email} {--name=Platform yöneticisi}';

    protected $description = 'Gizli parola istemiyle platform yöneticisi oluşturur; mevcut hesabı yükseltmez.';

    public function handle(): int
    {
        $data = [
            'email' => mb_strtolower(trim($this->argument('email'))), 'name' => $this->option('name'),
            'password' => $this->secret('Parola'), 'password_confirmation' => $this->secret('Parola tekrar'),
        ];
        $validator = Validator::make($data, [
            'email' => ['required', 'email:rfc', 'max:254', 'unique:users,email'],
            'name' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:128', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }
        DB::transaction(function () use ($data) {
            $user = User::forceCreate([
                'name' => $data['name'], 'email' => $data['email'], 'password' => $data['password'],
                'platform_role' => 'platform_admin', 'status' => 'active', 'email_verified_at' => now(),
            ]);
            StudyContext::create(['user_id' => $user->id]);
        });
        $this->info('Platform yöneticisi oluşturuldu.');

        return self::SUCCESS;
    }
}
