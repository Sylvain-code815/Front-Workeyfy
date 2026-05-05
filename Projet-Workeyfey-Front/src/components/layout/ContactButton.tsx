import './ContactButton.css';

type ContactButtonProps = {
    fixed?: boolean;
};

export default function ContactButton({ fixed = false }: ContactButtonProps) {
    return (
        <a
            href="mailto:hello@workify.com"
            className={`ContactButton${fixed ? ' ContactButton--fixed' : ''}`}
        >
            Contact
        </a>
    );
}
