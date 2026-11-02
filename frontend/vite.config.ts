import react from '@vitejs/plugin-react'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

function injectAssistantScript(html: string) {
  if (html.includes('cuckoo-assistant.js')) return html

  const script = '<script defer src="/cuckoo-assistant.js"></script>'
  return /<\/body\s*>/i.test(html)
    ? html.replace(/<\/body\s*>/i, `${script}</body>`)
    : `${html}${script}`
}

function assistantScriptPlugin(): Plugin {
  let outputDirectory = ''
  let isProductionBuild = false

  return {
    name: 'cuckoo-assistant-script',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir)
      isProductionBuild = config.command === 'build'
    },
    transformIndexHtml(html: string) {
      return injectAssistantScript(html)
    },
    async closeBundle() {
      if (!isProductionBuild) return

      async function injectIntoHtmlFiles(directory: string) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const filePath = resolve(directory, entry.name)
          if (entry.isDirectory()) {
            await injectIntoHtmlFiles(filePath)
          } else if (entry.isFile() && entry.name.endsWith('.html')) {
            const html = await readFile(filePath, 'utf8')
            const updatedHtml = injectAssistantScript(html)
            if (updatedHtml !== html) await writeFile(filePath, updatedHtml)
          }
        }
      }

      await injectIntoHtmlFiles(outputDirectory)
    },
  }
}

export default defineConfig({
  plugins: [react(), assistantScriptPlugin()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
