import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'
export function Manualtippy(props) {
    return <Tippy {...props} delay={[500, 100]} animation={props.animation || 'fade'} theme={props.theme || 'material'} />

}