import PropTypes from 'prop-types'

export const accountTypeDef = PropTypes.shape(
    {
        _id: PropTypes.string,
        service: PropTypes.string,
        userAuth: PropTypes.object
    }
);

export const serviceTypeDef = PropTypes.shape(
    {
        key: PropTypes.string,
        name: PropTypes.string,
        formFields: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string,
            description: PropTypes.string,
            placeholder: PropTypes.string,
        }))
    }
);
