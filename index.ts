import { start, socketStopper } from '@utils/socket-starter'

await start()
await socketStopper()