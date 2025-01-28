import * as React from "react";
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button } from "@chakra-ui/react"
import { useEffect, useState } from "react";
export function ManualClose(props) {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const { Header, Message, success, successFunction, error, errorFunction, active, timeout } = props.value;
    useEffect(() => {
        active && onOpen()
    }, [active])

    function Timeout({ timeout, onClose }) {
        const [timer, setTimer] = useState(timeout / 1000);

        useEffect(() => {
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
    return (
        <>
            <Button onClick={onOpen}>Open Modal</Button>
            <Modal closeOnOverlayClick={false} isOpen={isOpen} onClose={onClose}>
                <ModalOverlay bg='blackAlpha.300' backdropFilter='blur(5px)' />
                <ModalContent bg='blackAlpha.500'>
                    <ModalHeader>{Header}</ModalHeader>
                    {/* <ModalCloseButton /> */}
                    <ModalBody pb={6} className="grey">
                        {Message}
                    </ModalBody>

                    <ModalFooter justifyContent={'center'}>
                        {success && <Button colorScheme='blue' mr={3} onClick={() => { successFunction(); onClose() }}>
                            {success}
                        </Button>}
                        {error && <Button onClick={onClose} colorScheme="red">{error} {timeout && <Timeout timeout={timeout || 15000} onClose={() => { errorFunction; onClose }} />}  </Button>}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}