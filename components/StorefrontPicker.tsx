'use client'
import { useEffect, useMemo, useState } from 'react'
import { deviceStorefront, savedStorefront, setStorefront } from '@/lib/catalog'
import { useI18n } from '@/lib/i18n'

const countries =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(
    ' ',
  )

export default function StorefrontPicker() {
  const { lang, t } = useI18n()
  const [region, setRegion] = useState('')
  const [device, setDevice] = useState('')
  useEffect(() => {
    setRegion(savedStorefront())
    setDevice(deviceStorefront())
  }, [])
  const options = useMemo(() => {
    if (!device) return []
    const display = new Intl.DisplayNames([lang], { type: 'region' })
    const collator = new Intl.Collator(lang)
    return countries.map((code) => ({ code, name: display.of(code) || code })).sort((a, b) => collator.compare(a.name, b.name))
  }, [lang, device])

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="apple-region" className="font-editorial text-3xl text-[#F5F5F5]">
          {t('ls.storefront')}
        </label>
        <p className="mt-1 text-sm text-[#999999]">{t('ls.storeHelp')}</p>
      </div>
      <select
        id="apple-region"
        value={region}
        onChange={(e) => {
          setRegion(e.target.value)
          setStorefront(e.target.value)
        }}
        className="min-h-[46px] w-full max-w-sm rounded-xl border border-white/[0.1] bg-[#111114] px-3.5 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#FA334F]"
      >
        <option value="">{t('ls.deviceStore', { region: device || '…' })}</option>
        {options.map(({ code, name }) => (
          <option value={code} key={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}
