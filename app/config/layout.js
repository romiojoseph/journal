import ConfigLayoutClient from '../../components/ConfigLayoutClient';

export default function ConfigLayout({ children }) {
    return (
        <ConfigLayoutClient>
            {children}
        </ConfigLayoutClient>
    );
}