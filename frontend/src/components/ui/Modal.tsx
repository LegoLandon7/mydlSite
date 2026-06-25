import './Modal.scss';

type ModalProps = {
    onClose: () => void;
    children: React.ReactNode;
};

export default function Modal({ onClose, children }: ModalProps) {
    return (
        <>
            <div className="modal-bg" onClick={onClose} />
            <div className="modal-box">
                {children}
            </div>
        </>
    );
}
