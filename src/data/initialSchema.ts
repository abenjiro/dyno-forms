import { FormSchema } from '../types/schema';

export const sampleFormSchema: FormSchema = {
  id: 'form_enterprise_onboarding',
  version: '1.0.0',
  title: 'Enterprise Vendor & Partner Application',
  description: 'Please complete all required sections to initiate enterprise vendor verification.',
  settings: {
    submitLabel: 'Submit Verification',
    resetLabel: 'Clear Form',
    showReset: true,
    submitUrl: '/api/forms/submit',
    submitMethod: 'POST',
    enableDrafts: true,
    draftAutoSaveIntervalMs: 1500,
    theme: {
      primaryColor: '#2563eb',
      borderRadius: 'md',
      density: 'comfortable',
    },
  },
  root: {
    id: 'root_canvas',
    type: 'canvas',
    isContainer: true,
    treeDepth: 0,
    children: [
      {
        id: 'sec_company_info',
        type: 'section',
        label: 'Organization Details',
        description: 'Primary legal entity information',
        isContainer: true,
        treeDepth: 1,
        children: [
          {
            id: 'grid_company_row_1',
            type: 'grid',
            isContainer: true,
            treeDepth: 2,
            layoutProps: {
              columns: 2,
              gap: 4,
            },
            children: [
              {
                id: 'field_company_name',
                type: 'text',
                name: 'companyName',
                label: 'Legal Company Name',
                placeholder: 'e.g. Acme Global Technologies Ltd.',
                helperText: 'Must match official business registration certificate',
                treeDepth: 3,
                validation: {
                  required: true,
                  requiredMessage: 'Legal company name is required',
                  minLength: 2,
                },
              },
              {
                id: 'field_tax_id',
                type: 'text',
                name: 'taxId',
                label: 'Tax Identification / EIN Number',
                placeholder: 'e.g. 12-3456789',
                treeDepth: 3,
                validation: {
                  required: true,
                  requiredMessage: 'Tax ID is required for verification',
                },
              },
            ],
          },
          {
            id: 'grid_country_location',
            type: 'grid',
            isContainer: true,
            treeDepth: 2,
            layoutProps: {
              columns: 2,
              gap: 4,
            },
            children: [
              {
                id: 'field_country',
                type: 'select',
                name: 'country',
                label: 'Country of Incorporation',
                placeholder: 'Select Country...',
                treeDepth: 3,
                dataSource: {
                  type: 'api',
                  api: {
                    url: 'http://localhost:4050/api/countries',
                    labelPath: 'name.common',
                    valuePath: 'cca2',
                    cacheTimeMs: 300000,
                  },
                },
                validation: {
                  required: true,
                  requiredMessage: 'Please select your country of incorporation',
                },
              },
              {
                id: 'field_state',
                type: 'select',
                name: 'stateProvince',
                label: 'State / Province',
                placeholder: 'Select State / Province...',
                treeDepth: 3,
                dataSource: {
                  type: 'api',
                  api: {
                    url: 'http://localhost:4050/api/states',
                    labelPath: 'label',
                    valuePath: 'code',
                    dependsOnField: 'country',
                    dependencyParamKey: 'country',
                    cacheTimeMs: 300000,
                  },
                },
                validation: {
                  required: true,
                  requiredMessage: 'Please select a state or province',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'sec_contact_info',
        type: 'section',
        label: 'Primary Contact Person',
        description: 'Authorized representative for contract execution',
        isContainer: true,
        treeDepth: 1,
        children: [
          {
            id: 'grid_contact_row',
            type: 'grid',
            isContainer: true,
            treeDepth: 2,
            layoutProps: {
              columns: 2,
              gap: 4,
            },
            children: [
              {
                id: 'field_contact_name',
                type: 'text',
                name: 'contactName',
                label: 'Full Name',
                placeholder: 'e.g. Sarah Jenkins',
                treeDepth: 3,
                validation: {
                  required: true,
                  requiredMessage: 'Representative name is required',
                },
              },
              {
                id: 'field_contact_email',
                type: 'text',
                name: 'contactEmail',
                label: 'Work Email Address',
                placeholder: 'sarah@company.com',
                treeDepth: 3,
                validation: {
                  required: true,
                  email: true,
                  requiredMessage: 'A valid business email is required',
                },
              },
            ],
          },
          {
            id: 'field_org_type',
            type: 'radio',
            name: 'organizationType',
            label: 'Business Entity Structure',
            treeDepth: 2,
            dataSource: {
              type: 'static',
              staticOptions: [
                { label: 'Corporation (C-Corp / S-Corp / Ltd)', value: 'corporation' },
                { label: 'Limited Liability Company (LLC)', value: 'llc' },
                { label: 'Partnership', value: 'partnership' },
                { label: 'Sole Proprietorship', value: 'sole_proprietor' },
              ],
            },
            validation: {
              required: true,
              requiredMessage: 'Please select your business structure',
            },
          },
          {
            id: 'field_notes',
            type: 'textarea',
            name: 'businessDescription',
            label: 'Brief Description of Core Services',
            placeholder: 'Detail the primary services, goods, or consulting provided...',
            treeDepth: 2,
            validation: {
              required: false,
              maxLength: 500,
            },
          },
          {
            id: 'field_terms_agreement',
            type: 'checkbox',
            name: 'termsAgreed',
            label: 'I certify that all information submitted is true and accurate under penalty of perjury.',
            treeDepth: 2,
            validation: {
              required: true,
              requiredMessage: 'You must accept the certification declaration',
            },
          },
        ],
      },
    ],
  },
};
