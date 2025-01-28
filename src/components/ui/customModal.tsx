import * as React from "react"
import { Button } from "@/components/ui/button"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./alert-dialog"

export function CustomModal(props) {
  const [open, setOpen] = React.useState(false);
  const { Header, Message, success, successFunction, error, errorFunction, active, timeout } = props.value;

  React.useEffect(() => {
    active && setOpen(prev => !prev)
  }, [active])

  return (<>
    <Button onClick={() => setOpen(prev => !prev)}>Hello</Button>
    <AlertDialog open={open} onOpenChange={setOpen}>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {Header}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {Message}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {success && <Button onClick={() => { successFunction(); }}>
            {success}
          </Button>}
          {error && <Button variant="destructive">{error} {timeout && <Timeout timeout={timeout || 15000} onClose={() => { errorFunction; }} />}  </Button>}
          <AlertDialogCancel>

          </AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { }}>

          </AlertDialogAction>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  </>

  )
}
function Timeout({ timeout, onClose }) {
  const [timer, setTimer] = React.useState(timeout / 1000);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prevTimer => prevTimer - 1);
    }, 1000);

    const timeoutId = setTimeout(() => {
      clearInterval(interval);
      onClose();
    }, timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [timeout, onClose]);

  return <>({timer}s)</>;
}