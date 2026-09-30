import { currentAppearance, saveAppearance, type Appearance } from 'kitshelf-ui/app/appearance.ts'
import BackupCard from 'kitshelf-ui/backup/BackupCard.tsx'
import { readBackup, type Backup, type BackupPreview, type RestoreMode } from 'kitshelf-ui/backup/format.ts'
import RestoreSheet from 'kitshelf-ui/backup/RestoreSheet.tsx'
import { restoreBackup, saveBackup } from 'kitshelf-ui/backup/save.ts'
import StorageStatus from 'kitshelf-ui/backup/StorageStatus.tsx'
import { readErrorMessage, RESTORE_FAILED_MESSAGE, restoreMessage, saveMessage, wipeWarning } from 'kitshelf-ui/backup/texts.ts'
import { Button } from 'kitshelf-ui/ui/Button.tsx'
import ChoiceGroup from 'kitshelf-ui/ui/ChoiceGroup.tsx'
import ConfirmDialog from 'kitshelf-ui/ui/ConfirmDialog.tsx'
import { AutoIcon, MoonIcon, SunIcon } from 'kitshelf-ui/ui/icons.tsx'
import InfoDialog from 'kitshelf-ui/ui/InfoDialog.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import SettingsFooter from 'kitshelf-ui/ui/SettingsFooter.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useEffect, useState, type ReactNode } from 'react'
import { useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { BACKUP_TEXTS, noteCount, replaceWarning, useBackupReminder, useKitBackup } from '../backup/kitBackup.ts'
import type { KitData } from '../backup/restorePlan.ts'
import { KIT_NAME } from '../kit.ts'
import { googleKey } from '../search/googleBooks.ts'
import { wipeDevice } from '../storage/wipe.ts'
import styles from './SettingsScreen.module.css'

const buildTime = new Date(__BUILD_TIME__).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })

const APPEARANCES: { value: Appearance; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'Oto', icon: <AutoIcon /> },
  { value: 'light', label: 'Açık', icon: <SunIcon /> },
  { value: 'dark', label: 'Koyu', icon: <MoonIcon /> },
]

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

// What leaves the device: Open Library hears every search; Google only the ones the reader sends it.
const PRIVACY = googleKey()
  ? 'Kitap ararken yalnızca yazdığın metin Open Library’ye gider; “Google Books’ta ara”ya basarsan Google Books’a da gider.'
  : 'Kitap ararken yalnızca yazdığın metin Open Library’ye gider.'

export default function SettingsScreen() {
  const { books, covers } = useAppData()
  const backup = useKitBackup()
  const { reminder, lastBackupAt, refresh } = useBackupReminder()
  const show = useToast()
  const [usage, setUsage] = useState<number>()
  const [confirming, setConfirming] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [appearance, setAppearance] = useState(currentAppearance)
  const [saving, setSaving] = useState(false)
  const [opened, setOpened] = useState<{ backup: Backup<KitData>; preview: BackupPreview }>()
  const [restoring, setRestoring] = useState(false)
  const [problem, setProblem] = useState<string>()

  // How much room the app takes; the browser answers for the whole site, not just our stores.
  useEffect(() => {
    let active = true
    navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (active && estimate.usage !== undefined) setUsage(estimate.usage)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [books, covers])

  // Straight from the tap: saveBackup opens the share sheet before anything is awaited.
  const save = () => {
    setSaving(true)
    void saveBackup(backup).then((result) => {
      setSaving(false)
      refresh()
      const message = saveMessage(result)
      if (message) show(message, { duration: result.status === 'downloaded' ? 6000 : 4000 })
    })
  }

  const open = (file: File) => {
    void readBackup(file, backup).then((result) => {
      if (result.ok) setOpened({ backup: result.backup, preview: result.preview })
      else setProblem(readErrorMessage(result.error, KIT_NAME, result.kitName))
    })
  }

  const restore = (mode: RestoreMode) => {
    if (!opened) return
    setRestoring(true)
    void restoreBackup(opened.backup, backup, mode).then((outcome) => {
      setRestoring(false)
      setOpened(undefined)
      refresh()
      if (outcome.ok) show(restoreMessage(outcome.counts, mode))
      else setProblem(RESTORE_FAILED_MESSAGE)
    })
  }

  const wipe = () => {
    setWiping(true)
    void wipeDevice().then(() => {
      // A full load rather than a router change: every screen has to start from an empty device.
      location.replace(import.meta.env.BASE_URL)
    })
  }

  return (
    <Screen title="Ayarlar" back={href({ screen: 'home' })}>
      <h2 className={text.sectionTitle}>Yedek</h2>
      <BackupCard lastBackupAt={lastBackupAt} reminder={reminder} description={BACKUP_TEXTS.card} busy={saving} onSave={save} onFile={open} />

      <h2 className={`${text.sectionTitle} ${styles.later}`}>Görünüm</h2>
      <ChoiceGroup
        label="Görünüm"
        hideLabel
        options={APPEARANCES}
        selected={[appearance]}
        onToggle={(value) => {
          saveAppearance(value)
          setAppearance(value)
        }}
      />

      <h2 className={`${text.sectionTitle} ${styles.later}`}>Bu cihazda</h2>
      <section className={styles.card}>
        <StorageStatus />
        <dl className={styles.facts}>
          <div>
            <dt>Kitap</dt>
            <dd>{books.length}</dd>
          </div>
          <div>
            <dt>Not ve alıntı</dt>
            <dd>{noteCount(books)}</dd>
          </div>
          <div>
            <dt>Kapak</dt>
            <dd>{covers.size}</dd>
          </div>
          <div>
            <dt>Kapladığı yer</dt>
            <dd>{usage === undefined ? '—' : megabytes(usage)}</dd>
          </div>
        </dl>
      </section>
      <p className={text.hint}>{PRIVACY}</p>

      <h2 className={`${text.sectionTitle} ${styles.later}`}>Verileri sil</h2>
      <p className={text.hint}>
        Bu cihazdaki her şeyi siler: kitaplar, notlar, alıntılar, kapaklar ve ayarlar. Geri alınamaz; silmeden önce
        yedek al.
      </p>
      <Button variant="danger" disabled={wiping} onClick={() => setConfirming(true)}>
        {wiping ? 'Siliniyor…' : 'Tüm verileri sil'}
      </Button>

      <SettingsFooter version={buildTime} />

      <RestoreSheet
        open={opened !== undefined}
        preview={opened?.preview}
        mergeText={BACKUP_TEXTS.merge}
        replaceText={BACKUP_TEXTS.replace}
        replaceWarning={books.length > 0 && opened ? replaceWarning(books, opened.backup.data.books.length) : undefined}
        busy={restoring}
        onRestore={restore}
        onCancel={() => setOpened(undefined)}
      />

      <InfoDialog open={problem !== undefined} title="Yedek açılamadı" onClose={() => setProblem(undefined)}>
        {problem}
      </InfoDialog>

      <ConfirmDialog
        open={confirming}
        title="Her şey silinsin mi?"
        confirmLabel="Evet, sil"
        onConfirm={() => {
          setConfirming(false)
          wipe()
        }}
        onCancel={() => setConfirming(false)}
      >
        {books.length > 0 ? (
          <>
            <strong>{books.length} kitap</strong>, notları ve kapaklarıyla birlikte silinecek.
          </>
        ) : (
          <>Uygulama ayarları silinecek.</>
        )}{' '}
        Uygulama sıfırdan açılacak. {wipeWarning(lastBackupAt)}
      </ConfirmDialog>
    </Screen>
  )
}
