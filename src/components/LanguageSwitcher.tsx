import type { Lang } from "../i18n";

interface LanguageSwitcherProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

/* Okrągłe flagi (circle flags) — wbudowane inline jako SVG, bez zewnętrznych plików */

const FlagPL: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{ width: "100%", height: "100%", display: "block" }}>
    <mask id="pl-c"><circle cx="256" cy="256" r="256" fill="#fff"/></mask>
    <g mask="url(#pl-c)">
      <path fill="#eee" d="M0 0h512v256H0z"/>
      <path fill="#d80027" d="M0 256h512v256H0z"/>
    </g>
  </svg>
);

const FlagGB: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{ width: "100%", height: "100%", display: "block" }}>
    <mask id="gb-c"><circle cx="256" cy="256" r="256" fill="#fff"/></mask>
    <g mask="url(#gb-c)">
      <path fill="#eee" d="m0 0 8 22-8 23v23l32 54-32 54v32l32 48-32 48v32l32 54-32 54v68l22-8 23 8h23l54-32 54 32h32l48-32 48 32h32l54-32 54 32h68l-8-22 8-23v-23l-32-54 32-54v-32l-32-48 32-48v-32l-32-54 32-54V0l-22 8-23-8h-23l-54 32-54-32h-32l-48 32-48-32h-32l-54 32L68 0H0z"/>
      <path fill="#0052b4" d="M336 0v108L444 0Zm176 68L404 176h108zM0 176h108L0 68ZM68 0l108 108V0Zm108 512V404L68 512ZM0 444l108-108H0Zm512-108H404l108 108Zm-68 176L336 404v108z"/>
      <path fill="#d80027" d="M0 0v45l131 131h45L0 0zm208 0v208H0v96h208v208h96V304h208v-96H304V0h-96zm259 0L336 131v45L512 0h-45zM176 336 0 512h45l131-131v-45zm160 0 176 176v-45L381 336h-45z"/>
    </g>
  </svg>
);

const FLAGS: Array<{ code: Lang; label: string; Icon: React.FC }> = [
  { code: "pl", label: "Polski",  Icon: FlagPL },
  { code: "en", label: "English", Icon: FlagGB },
];

const FLAG_BTN =
  "flex h-8 w-8 shrink-0 items-center shadow-lg justify-center rounded-full transition-transform duration-300 hover:scale-110 active:scale-95 sm:h-10 sm:w-10 [@media(max-height:500px)]:h-7 [@media(max-height:500px)]:w-7 p-0 bg-transparent overflow-hidden";

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ lang, onChange }) => (
  <>
    {FLAGS.map(({ code, label, Icon }) => (
      <button
        key={code}
        onClick={() => onChange(code)}
        className={FLAG_BTN}
        title={label}
        aria-label={label}
        aria-pressed={lang === code}
        style={{ filter: lang === code ? "grayscale(1)" : "none" }}
      >
        <Icon />
      </button>
    ))}
  </>
);
