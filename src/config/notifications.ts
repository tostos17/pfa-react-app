import { Modal } from 'antd';

export const notify = {
  success: (message: string) => {
    console.log(`SUCCESS: ${message}`);
  },
  info: (message: string) => {
    console.info(`INFO: ${message}`);
  },
  warning: (message: string) => {
    console.warn(`WARNING: ${message}`);
  },
  error: (message: string) => {
    console.error(`ERROR: ${message}`);
    Modal.error({
      title: 'Error Encountered',
      content: message,
      centered: true,
    });
  },
};
