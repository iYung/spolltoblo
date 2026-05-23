import { createApp } from './app.js'
const { server } = createApp()
const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
