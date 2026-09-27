import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
// CSS zoom enlarges controls; compensate viewport units so full-screen games still fit.
const displayViewport={postcssPlugin:'vpet-display-viewport',OnceExit(root){root.walkDecls(decl=>{decl.value=decl.value.replace(/(?<![\w-])(\d*\.?\d+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw)\b/g,(_,n,unit)=>`calc(${n}${unit} / var(--app-ui-scale, 1))`);});}};
export default {plugins:[tailwindcss(),autoprefixer(),displayViewport]};
