
export interface IBotConfigSchema {
    prefix: string,
    name?: string,
    version?: string,
    publisher?: string,
}
export const bot: IBotConfigSchema = ({
    prefix: '.',
    name: 'Hoshino',
    publisher: 'XNS-ivy',
    version: '1.0.0',
})