import { Suspense } from 'react';
import DocumentDetailsEdit from '../../../views/DocumentDetailsEdit';

const DocumentDetailsPage = () => (
  <Suspense fallback={null}>
    <DocumentDetailsEdit />
  </Suspense>
);

export default DocumentDetailsPage;
