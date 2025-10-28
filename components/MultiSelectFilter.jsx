'use client';

import Select from 'react-select';

// Custom styles to make react-select match our dark theme
const selectStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: 'var(--monochrome-13)',
        border: '1px solid var(--monochrome-10)',
        borderRadius: '12px',
        boxShadow: 'none',
        minHeight: '44px',
        fontSize: 'var(--font-size-body)',
        '&:hover': {
            borderColor: 'var(--accent-color)',
        },
        borderColor: state.isFocused ? 'var(--accent-color)' : 'var(--monochrome-10)',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: 'var(--monochrome-13)',
        border: '1px solid var(--monochrome-10)',
        borderRadius: '12px',
        marginTop: '4px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? 'var(--accent-color)'
            : state.isFocused
                ? 'var(--monochrome-10)'
                : 'transparent',
        color: state.isSelected ? 'var(--monochrome-0)' : 'var(--monochrome-2)',
        fontSize: 'var(--font-size-body)',
        padding: '12px 16px',
        '&:active': {
            backgroundColor: 'var(--accent-color)',
        },
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: 'var(--accent-color)',
        borderRadius: '6px',
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: 'var(--monochrome-0)',
        fontSize: '0.875rem',
        padding: '4px 8px',
    }),
    multiValueRemove: (provided) => ({
        ...provided,
        color: 'var(--monochrome-0)',
        borderRadius: '0 6px 6px 0',
        '&:hover': {
            backgroundColor: 'var(--monochrome-10)',
            color: 'var(--monochrome-0)',
        },
    }),
    placeholder: (provided) => ({
        ...provided,
        color: 'var(--monochrome-6)',
        fontSize: 'var(--font-size-body)',
    }),
    input: (provided) => ({
        ...provided,
        color: 'var(--monochrome-2)',
        fontSize: 'var(--font-size-body)',
    }),
    singleValue: (provided) => ({
        ...provided,
        color: 'var(--monochrome-2)',
        fontSize: 'var(--font-size-body)',
    }),
    indicatorSeparator: (provided) => ({
        ...provided,
        backgroundColor: 'var(--monochrome-10)',
    }),
    dropdownIndicator: (provided, state) => ({
        ...provided,
        color: 'var(--monochrome-5)',
        '&:hover': {
            color: 'var(--monochrome-2)',
        },
    }),
    clearIndicator: (provided, state) => ({
        ...provided,
        color: 'var(--monochrome-5)',
        '&:hover': {
            color: 'var(--monochrome-2)',
        },
    }),
};

// This component is now simple and has no effects.
export default function MultiSelectFilter({ options, value, onChange, placeholder }) {
    return (
        <Select
            isMulti
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            styles={selectStyles}
            classNamePrefix="react-select"
        />
    );
}