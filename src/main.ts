import { registerPlugin, Ctx, ctx } from '@yank-note/runtime-api'

const pluginName = 'extension-background'
const settingPath = 'extension-background.path'
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
const setBackground = async (style: HTMLStyleElement, path: string, opacity: number) => {
    path = path.trim()
    if (path === '') {
        style.innerHTML = ''
        return
    }

    let url = path
    if (!/^https?:\/\//.test(path)) {
        if (ctx.env.isElectron) {
            url = `file://${path.replaceAll('\\', '/')}`
        }
        else {
            // 浏览器环境下，需要将图片转为 Base64
            url = await ctx.api.rpc(`
const fs = require('fs-extra')
const mime = require('mime')
const base64 = await fs.readFile(${ctx.utils.quote(path)}, 'base64')
const type = mime.getType(${ctx.utils.quote(path)})
return 'data:' + type + ';base64,' + base64
`)
        }
    }

    style.innerHTML = `
#app::before {
    content: "";
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 1000000;
    pointer-events: none;
    background: url("${url}") no-repeat center/cover;
    opacity: ${opacity / 2};
}
`
}

const pluginRegister = async (ctx: Ctx) => {
    const style = await ctx.theme.addStyles('')

    // 设置面板
    ctx.setting.changeSchema(schema => {
        schema.properties[settingPath] = {
            title: '背景图路径',
            group: 'appearance',
            type: 'string',
            defaultValue: defaultPath,
            openDialogOptions: {
                properties: ['openFile'],
                filters: [{ name: '图像文件', extensions: ['jpeg', 'jpg', 'png', 'webp', 'svg', 'gif'] }]
            }
        }

        schema.properties[settingOpacity] = {
            title: '背景图不透明度',
            group: 'appearance',
            type: 'number',
            defaultValue: defaultOpacity,
            format: 'range',
            step: .01,
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
