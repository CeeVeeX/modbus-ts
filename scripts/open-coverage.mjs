import { existsSync } from 'node:fs'
import { exec } from 'node:child_process'
import { resolve } from 'node:path'

const reportPath = resolve(process.cwd(), 'coverage', 'index.html')

if (!existsSync(reportPath)) {
  console.error(`[coverage:open] report not found: ${reportPath}`)
  console.error('[coverage:open] run: pnpm test:coverage')
  process.exit(1)
}

const openCommand =
  process.platform === 'win32'
    ? `start "" "${reportPath}"`
    : process.platform === 'darwin'
      ? `open "${reportPath}"`
      : `xdg-open "${reportPath}"`

const shell = process.platform === 'win32' ? 'cmd.exe' : true

exec(openCommand, { shell }, (error) => {
  if (error) {
    console.error(`[coverage:open] failed to open report: ${error.message}`)
    process.exit(1)
    return
  }

  console.log(`[coverage:open] opened: ${reportPath}`)
})
