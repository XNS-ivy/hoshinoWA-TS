import { start, socketStopper } from '@utils/socket-starter'
import envCheck from '@utils/env-checker'

envCheck()
await start()
await socketStopper()