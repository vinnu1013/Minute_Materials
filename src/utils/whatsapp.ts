export function generateDirectWhatsAppChatUrl(phoneNumber: string, message?: string): string {
  const cleanNumber = (phoneNumber || '9059236500').toString().replace(/\D/g, '');
  const formattedNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
  const defaultText = 'Hi Minute Materials, I need urgent jobsite delivery support.';
  const encodedText = encodeURIComponent(message || defaultText);
  return `https://wa.me/${formattedNumber}?text=${encodedText}`;
}
