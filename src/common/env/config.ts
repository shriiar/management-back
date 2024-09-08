export function selectEnv(): string[] {
    const currentEnv = process.env.NODE_ENV || Envs.Staging
    return [`.env.${currentEnv}`, '.env']
}

enum Envs {
    Staging = 'stg',
    Production = 'prod',
}