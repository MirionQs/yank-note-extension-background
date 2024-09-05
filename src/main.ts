import { registerPlugin, Ctx } from '@yank-note/runtime-api'

const pluginName = 'extension-background'
const settingPath = 'extension-background.image-path'
const settingOpacity = 'extension-background.opacity'
const actionToggle = 'extension-background.toggle'

const defaultPath = ''
const defaultOpacity = .3

/**
 * 设置背景
 * @param style HTML样式元素
 * @param path 背景图路径
 * @param opacity 背景图不透明度，自动/2避免挡住界面
 */
const setBackground = (style: HTMLStyleElement, path: string, opacity: number) => {
  style.innerHTML = `
#app::before {
    content: "";
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 1000000;
    pointer-events: none;
    background: url("${path.replaceAll('\\', '/')}") no-repeat center/cover;
    opacity: ${opacity / 2};
}
`
}

const pluginRegister = async (ctx: Ctx) => {
  const fs = ctx.env.nodeRequire('fs-extra')
  const style = await ctx.theme.addStyles('')

  // 设置面板
  ctx.setting.changeSchema(schema => {
    schema.properties[settingPath] = {
      title: '背景图路径',
      group: 'appearance',
      type: 'string',
      defaultValue: defaultPath,
      validator: (_, value, path) => {
        if (value !== '' && !(fs.pathExistsSync(value) && fs.statSync(value).isFile())) {
          return [{ property: settingPath, path, message: '路径无效' }]
        }
        return []
      }
    }
    schema.properties[settingOpacity] = {
      title: '背景图不透明度',
      group: 'appearance',
      type: 'number',
      defaultValue: defaultOpacity,
      format: 'range',
      step: 0.01,
      minimum: 0,
      maximum: 1
    }
  })

  // 命令面板
  ctx.editor.whenEditorReady().then(({ editor, monaco }) => {
    editor.addAction({
      id: actionToggle,
      label: 'background: 切换背景图',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyB],
      run: () => {
        style.disabled = !style.disabled
      }
    })
  })

  // 更改设置后刷新
  ctx.registerHook('SETTING_CHANGED', ({ changedKeys, settings }) => {
    if (changedKeys.includes(settingPath as any) || changedKeys.includes(settingOpacity as any)) {
      setBackground(style, settings[settingPath], settings[settingOpacity])
    }
  })

  setBackground(style, ctx.setting.getSetting(settingPath, defaultPath), ctx.setting.getSetting(settingOpacity, defaultOpacity))
}

registerPlugin({ name: pluginName, register: pluginRegister })