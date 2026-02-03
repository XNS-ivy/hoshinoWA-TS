
export interface IBotConfigSchema {
    prefix: string,
    name?: string,
    version?: string,
}
export const bot: IBotConfigSchema = ({
    prefix: '.',
    name: 'Hoshino',
    version: '1.0.0',
})