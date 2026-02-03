import { start, socketStopper } from '@utils/socket-starter'
import { config } from "@core/bot-config"
import command from '@core/commands'

await command.init()
await config.init()
await start()
await socketStopper()