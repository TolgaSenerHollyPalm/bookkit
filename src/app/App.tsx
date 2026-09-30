import ConnectionNotice from 'kitshelf-ui/app/ConnectionNotice.tsx'
import toast from 'kitshelf-ui/app/toast.module.css'
import { ToastProvider, Toasts } from 'kitshelf-ui/ui/Toast.tsx'
import { useEffect } from 'react'
import { KIT_NAME } from '../kit.ts'
import AddBookScreen from '../screens/AddBookScreen.tsx'
import BookScreen from '../screens/BookScreen.tsx'
import EditBookScreen from '../screens/EditBookScreen.tsx'
import HomeScreen from '../screens/HomeScreen.tsx'
import SettingsScreen from '../screens/SettingsScreen.tsx'
import AppDataProvider from './AppDataProvider.tsx'
import { screenKey, useRoute, type Route } from './router.ts'
import UpdatePrompt from './UpdatePrompt.tsx'

export default function App() {
  const route = useRoute()
  const screen = screenKey(route)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <ToastProvider>
      <AppDataProvider>
        {/* Keyed by screen, so each one starts fresh; a library tab is the same screen. */}
        <CurrentScreen key={screen} route={route} />
      </AppDataProvider>
      <div className={toast.stack}>
        <UpdatePrompt />
        <ConnectionNotice appName={KIT_NAME} />
        <Toasts />
      </div>
    </ToastProvider>
  )
}

function CurrentScreen({ route }: { route: Route }) {
  switch (route.screen) {
    case 'home':
      return <HomeScreen tab={route.tab} />
    case 'settings':
      return <SettingsScreen />
    case 'add-manual':
      return <AddBookScreen />
    case 'book':
      return <BookScreen bookId={route.bookId} />
    case 'book-edit':
      return <EditBookScreen bookId={route.bookId} />
  }
}
