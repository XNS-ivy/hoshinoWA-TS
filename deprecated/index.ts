import { start, socketStopper } from '@utils/socket-starter'
import { config } from "@core/bot-config"
import command from '@core/commands'

await config.init()
await command.init()
await start()
await socketStopper()