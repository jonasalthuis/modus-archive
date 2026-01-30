import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    // Ensure that incoming locale is valid
    if (!locale || !['en', 'nl'].includes(locale)) {
        locale = 'en';
    }

    const messages = locale === 'nl'
        ? (await import(`../messages/nl.json`)).default
        : (await import(`../messages/en.json`)).default;

    return {
        locale,
        messages
    };
});
