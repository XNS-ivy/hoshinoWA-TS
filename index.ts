import { start, socketStopper } from '@utils/socket-starter'
import { config } from "@core/bot-config"

await config.init()
await start()
await socketStopper()