import type {
  CitizenRegistrationInput,
  CurpValidationResult,
} from "@tuxtla/types";
export const normalizeName = (name: string) =>
  name.trim().replace(/\s+/gu, " ");
export const comparableName = (name: string) =>
  normalizeName(name)
    .toUpperCase()
    .replace(/Ñ/g, "#")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/#/g, "Ñ");
export function ageOn(birth: string, today = new Date()): number {
  const [y = 0, m = 0, d = 0] = birth.split("-").map(Number);
  const current = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const [cy = 0, cm = 0, cd = 0] = current.split("-").map(Number);
  return cy - y - (cm < m || (cm === m && cd < d) ? 1 : 0);
}
export function checkDigit(first17: string): string {
  const dictionary = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  if (!/^[A-Z0-9]{17}$/.test(first17)) return "";
  return String(
    (10 -
      ([...first17].reduce(
        (sum, c, i) => sum + dictionary.indexOf(c) * (18 - i),
        0,
      ) %
        10)) %
      10,
  );
}
const particles = new Set([
  "DA",
  "DAS",
  "DE",
  "DEL",
  "DER",
  "DI",
  "DIE",
  "DD",
  "EL",
  "LA",
  "LAS",
  "LOS",
  "LE",
  "LES",
  "MAC",
  "MC",
  "VAN",
  "VON",
  "Y",
]);
function significant(value: string) {
  return comparableName(value)
    .split(" ")
    .filter((w) => !particles.has(w));
}
const initial = (s: string) => (s[0] === "Ñ" ? "X" : (s[0] ?? "X"));
const consonant = (s: string) =>
  s
    .slice(1)
    .match(/[B-DF-HJ-NÑP-TV-Z]/)?.[0]
    ?.replace("Ñ", "X") ?? "X";
const badWords = new Set(
  "BACA BAKA BUEI BUEY CACA CACO CAGA CAGO CAKA CAKO COGE COGI COJA COJE COJI COJO COLA CULO FALO FETO GETA GUEI GUEY JETA JOTO KACA KACO KAGA KAGO KAKA KAKO KOGE KOGI KOJA KOJE KOJI KOJO KOLA KULO LILO LOCA LOCO LOKA LOKO MAME MAMO MEAR MEAS MEON MIAR MION MOCO MOKO MULA MULO NACA NACO PEDA PEDO PENE PIPI PITO POPO PUTA PUTO QULO RATA ROBA ROBE ROBO RUIN SENO TETA VACA VAGA VAGO VAKA VUEI VUEY WUEI WUEY".split(
    " ",
  ),
);
export function nameCode(
  data: Pick<
    CitizenRegistrationInput,
    "first_names" | "paternal_surname" | "maternal_surname"
  >,
) {
  const names = significant(data.first_names);
  if (names.length > 1 && ["JOSE", "MARIA", "MA", "J"].includes(names[0] ?? ""))
    names.shift();
  const n = names[0] ?? "",
    p = significant(data.paternal_surname)[0] ?? "",
    m = significant(data.maternal_surname)[0] ?? "";
  let prefix =
    initial(p) +
    (p.slice(1).match(/[AEIOU]/)?.[0] ?? "X") +
    initial(m) +
    initial(n);
  if (badWords.has(prefix)) prefix = prefix[0] + "X" + prefix.slice(2);
  return { prefix, consonants: consonant(p) + consonant(m) + consonant(n) };
}
export function validateCurp(
  data: Pick<
    CitizenRegistrationInput,
    | "curp"
    | "age"
    | "sex"
    | "first_names"
    | "paternal_surname"
    | "maternal_surname"
  >,
  today = new Date(),
): CurpValidationResult {
  const curp = data.curp.replace(/\s/g, "").toUpperCase();
  const errors: string[] = [];
  if (
    !/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/.test(
      curp,
    )
  )
    return {
      valid: false,
      verificationLevel: "invalid",
      birthDate: null,
      errors: ["Revisa el formato de la CURP."],
    };
  const year =
    (/[A-Z]/.test(curp[16] ?? "") ? 2000 : 1900) + Number(curp.slice(4, 6));
  const month = Number(curp.slice(6, 8)),
    day = Number(curp.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    errors.push("La fecha de nacimiento de la CURP no es válida.");
  const age = ageOn(birthDate, today);
  if (age < 17 || age > 120) errors.push("Debes tener entre 17 y 120 años.");
  if (age !== data.age) errors.push("La edad no coincide con la CURP.");
  if (curp[10] !== data.sex) errors.push("El sexo no coincide con la CURP.");
  if (checkDigit(curp.slice(0, 17)) !== curp[17])
    errors.push("El dígito verificador de la CURP no es válido.");
  const expected = nameCode(data);
  if (
    expected.prefix !== curp.slice(0, 4) ||
    expected.consonants !== curp.slice(13, 16)
  )
    errors.push(
      "Los nombres y apellidos no coinciden con la CURP. Revisa los datos; los casos especiales requieren revisión autorizada.",
    );
  return {
    valid: errors.length === 0,
    verificationLevel: errors.length ? "invalid" : "structural_valid",
    birthDate,
    errors,
  };
}
