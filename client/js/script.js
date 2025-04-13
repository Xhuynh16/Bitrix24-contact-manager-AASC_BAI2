const API_BASE_URL = 'http://localhost:3000/api/contact';
let contacts = [];
const contactsTableBody = document.getElementById('contactsTableBody');
const searchInput = document.getElementById('searchInput');
const loadingSpinner = document.getElementById('loadingSpinner');
const contactForm = document.getElementById('contactForm');
const editContactForm = document.getElementById('editContactForm');
const saveContactBtn = document.getElementById('saveContact');
const updateContactBtn = document.getElementById('updateContact');
const addContactModal = new bootstrap.Modal(document.getElementById('addContactModal'));
const editContactModal = new bootstrap.Modal(document.getElementById('editContactModal'));
const showLoading = () => loadingSpinner.classList.remove('d-none');
const hideLoading = () => loadingSpinner.classList.add('d-none');

const showToast = (message, type = 'success') => {
    alert(message);
};

const formatFullAddress = (ward, district, city) => {
    return [ward, district, city].filter(Boolean).join(', ');
};

const parseAddress = (address) => {
    if (!address) return { ward: '', district: '', city: '' };

    if (typeof address === 'string') {
        const parts = address.split(', ');
        return {
            ward: parts[0] || '',
            district: parts[1] || '',
            city: parts[2] || ''
        };
    }

    return {
        ward: address.ADDRESS_1 || '',
        district: address.PROVINCE || '',
        city: address.CITY || ''
    };
};

// API Functions
async function fetchContacts() {
    try {
        showLoading();
        const response = await fetch(API_BASE_URL);
        const data = await response.json();
        if (data.success) {
            contacts = Array.isArray(data.data) ? data.data : [];
            renderContacts(contacts);
        } else {
            throw new Error(data.message || 'Không thể tải danh sách liên hệ');
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách liên hệ:', error);
        showToast('Không thể tải danh sách liên hệ', 'error');
    } finally {
        hideLoading();
    }
}

async function createContact(contactData) {
    try {
        showLoading();
        console.log('Form Data received:', contactData);
        
        const fullAddress = formatFullAddress(
            contactData.ward,
            contactData.district,
            contactData.city
        );
        console.log('Formatted address:', fullAddress);
        const apiData = {
            fields: {
                NAME: contactData.name.trim(),
                LAST_NAME: contactData.lastName.trim(),
                PHONE: [{ VALUE: contactData.phone.trim(), VALUE_TYPE: "WORK" }],
                EMAIL: [{ VALUE: contactData.email.trim(), VALUE_TYPE: "WORK" }],
                WEB: contactData.website ? [{ VALUE: contactData.website.trim(), VALUE_TYPE: "WORK" }] : []
            },
            name: contactData.name.trim(),
            lastName: contactData.lastName.trim(),
            phone: contactData.phone.trim(),
            email: contactData.email.trim(),
            website: contactData.website ? contactData.website.trim() : '',
            address: fullAddress,
            city: contactData.city.trim(),
            region: contactData.district.trim(),
            bankName: contactData.bankName.trim(),
            bankAccount: contactData.bankAccount.trim()
        };
        console.log('Data being sent to BE:', JSON.stringify(apiData, null, 2));
        const requiredFields = ['name', 'lastName', 'phone', 'email', 'address', 'city', 'region', 'bankName', 'bankAccount'];
        const missingFields = requiredFields.filter(field => !apiData[field]);
        
        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            throw new Error(`Các trường sau là bắt buộc: ${missingFields.join(', ')}`);
        }

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(apiData),
        });
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response text:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                console.log('Parsed error data:', errorData);
                if (errorData.missingFields) {
                    throw new Error(`Thiếu các trường bắt buộc: ${errorData.missingFields.join(', ')}`);
                }
                if (errorData.error) {
                    throw new Error(errorData.error);
                }
            } catch (e) {
                console.log('Error parsing error response:', e);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }

        const data = await response.json();
        console.log('Success response data:', data);
        
        if (data.success) {
            showToast('Thêm liên hệ thành công');
            addContactModal.hide();
            contactForm.reset();
            await fetchContacts();
        } else {
            throw new Error(data.message || 'Không thể thêm liên hệ');
        }
    } catch (error) {
        console.error('Lỗi khi thêm liên hệ:', error);
        showToast(error.message || 'Không thể thêm liên hệ', 'error');
    } finally {
        hideLoading();
    }
}

async function updateContact(id, contactData) {
    console.log('=== Starting Update Contact ===');
    console.log('ID:', id);
    console.log('Raw Form Data:', contactData);
    
    try {
        if (!id) {
            throw new Error('ID liên hệ không hợp lệ');
        }

        showLoading();
        
        const fullAddress = formatFullAddress(
            contactData.ward,
            contactData.district,
            contactData.city
        );
        
        console.log('Formatted Address:', fullAddress);
        const apiData = {
            id: id,
            fields: {
                NAME: contactData.name?.trim() || '',
                LAST_NAME: contactData.lastName?.trim() || '',
                PHONE: [{ VALUE: contactData.phone?.trim() || '', VALUE_TYPE: "WORK" }],
                EMAIL: [{ VALUE: contactData.email?.trim() || '', VALUE_TYPE: "WORK" }],
                WEB: contactData.website ? [{ VALUE: contactData.website.trim(), VALUE_TYPE: "WORK" }] : []
            },
            name: contactData.name?.trim() || '',
            lastName: contactData.lastName?.trim() || '',
            phone: contactData.phone?.trim() || '',
            email: contactData.email?.trim() || '',
            website: contactData.website?.trim() || '',
            address: fullAddress || '',
            city: contactData.city?.trim() || '',
            region: contactData.district?.trim() || '',
            bankName: contactData.bankName?.trim() || '',
            bankAccount: contactData.bankAccount?.trim() || ''
        };

        console.log('=== Request Details ===');
        console.log('Request URL:', `${API_BASE_URL}/${id}`);
        console.log('Request Method: PUT');
        console.log('Request Headers:', {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        console.log('Request Body:', JSON.stringify(apiData, null, 2));

        const requiredFields = ['name', 'lastName', 'phone', 'email', 'address', 'city', 'region', 'bankName', 'bankAccount'];
        const missingFields = requiredFields.filter(field => !apiData[field]);
        
        if (missingFields.length > 0) {
            console.warn('Missing Fields:', missingFields);
            throw new Error(`Các trường sau là bắt buộc: ${missingFields.join(', ')}`);
        }

        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(apiData),
        });

        console.log('=== Response Details ===');
        console.log('Response Status:', response.status);
        console.log('Response Status Text:', response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error Response:', errorText);
            throw new Error(`Lỗi server: ${response.status} - ${errorText}`);
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 0) {
            const responseText = await response.text();
            try {
                const data = JSON.parse(responseText);
                console.log('=== Success Response ===');
                console.log('Response Data:', data);

                if (!data.success) {
                    throw new Error(data.message || 'Không thể cập nhật liên hệ');
                }
            } catch (e) {
                console.log('Response is not JSON, but update might be successful');
            }
        }

        showToast('Cập nhật liên hệ thành công');
        editContactModal.hide();
        await fetchContacts();

    } catch (error) {
        console.error('=== Update Error ===');
        console.error('Error:', error);
        console.error('Error Message:', error.message);
        console.error('Stack:', error.stack);
        showToast(error.message || 'Không thể cập nhật liên hệ', 'error');
        throw error;
    } finally {
        hideLoading();
        console.log('=== Update Complete ===');
    }
}

async function deleteContact(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa liên hệ này?')) return;

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
            showToast('Xóa liên hệ thành công');
            await fetchContacts();
        } else {
            throw new Error(data.message || 'Không thể xóa liên hệ');
        }
    } catch (error) {
        console.error('Lỗi khi xóa liên hệ:', error);
        showToast(error.message || 'Không thể xóa liên hệ', 'error');
    } finally {
        hideLoading();
    }
}

function renderContacts(contacts) {
    if (!Array.isArray(contacts)) {
        console.error('Dữ liệu contacts không hợp lệ:', contacts);
        return;
    }

    contactsTableBody.innerHTML = contacts.map(contact => {
        const address = parseAddress(contact.ADDRESS?.ADDRESS_1 || '');
        const fullName = [contact.LAST_NAME, contact.NAME].filter(Boolean).join(' ');
        
        return `
        <tr>
            <td>
                <div class="contact-name">${fullName || '-'}</div>
            </td>
            <td>
                <div class="contact-info">
                    ${Array.isArray(contact.PHONE) && contact.PHONE.length > 0 
                        ? contact.PHONE.map(p => p.VALUE).join(', ') 
                        : '-'}
                </div>
            </td>
            <td>
                <div class="contact-info">
                    ${Array.isArray(contact.EMAIL) && contact.EMAIL.length > 0
                        ? contact.EMAIL.map(e => `<a href="mailto:${e.VALUE}">${e.VALUE}</a>`).join(', ')
                        : '-'}
                </div>
            </td>
            <td>
                <div class="address-info">
                    ${address.ward ? `<div>Phường/Xã: ${address.ward}</div>` : ''}
                    ${address.district ? `<div>Quận/Huyện: ${address.district}</div>` : ''}
                    ${contact.ADDRESS?.CITY || contact.CITY ? `<div>Tỉnh/Thành phố: ${contact.ADDRESS?.CITY || contact.CITY}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="bank-info">
                    ${contact.BANK_NAME || contact.BANK_ACCOUNT ? `
                        ${contact.BANK_NAME ? `<div>Ngân hàng: ${contact.BANK_NAME}</div>` : ''}
                        ${contact.BANK_ACCOUNT ? `<div>STK: ${contact.BANK_ACCOUNT}</div>` : ''}
                    ` : '-'}
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary btn-action" onclick="handleEdit('${contact.ID}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-action" onclick="handleDelete('${contact.ID}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

function handleEdit(id) {
    const contact = contacts.find(c => c.ID === id);
    if (!contact) {
        showToast('Không tìm thấy liên hệ', 'error');
        return;
    }

    const address = parseAddress(contact.ADDRESS);
    
    const form = editContactForm;
    form.contactId.value = contact.ID;
    form.name.value = contact.NAME || '';
    form.lastName.value = contact.LAST_NAME || '';
    form.phone.value = contact.PHONE?.[0]?.VALUE || '';
    form.email.value = contact.EMAIL?.[0]?.VALUE || '';
    form.website.value = contact.WEB?.[0]?.VALUE || '';
    form.ward.value = address.ward;
    form.district.value = address.district;
    form.city.value = address.city || contact.CITY || '';
    form.bankName.value = contact.BANK_NAME || '';
    form.bankAccount.value = contact.BANK_ACCOUNT || '';

    editContactModal.show();
}

function handleDelete(id) {
    deleteContact(id);
}

async function handleSave(event) {
    try {
        showLoading();
        const form = document.getElementById('contactForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const contactData = Object.fromEntries(formData.entries());
        await createContact(contactData);
        
        showToast('Thêm liên hệ thành công');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addContactModal'));
        modal.hide();
        
        form.reset();
        
        await fetchContacts();
    } catch (error) {
        console.error('Error in save handler:', error);
        showToast(error.message || 'Không thể thêm liên hệ', 'error');
    } finally {
        hideLoading();
    }
}

async function handleUpdate(event) {
    try {
        showLoading();
        const form = document.getElementById('editContactForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const contactData = Object.fromEntries(formData.entries());
        const contactId = contactData.contactId;
        delete contactData.contactId;
        
        await updateContact(contactId, contactData);
        
        showToast('Cập nhật liên hệ thành công');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editContactModal'));
        modal.hide();
        
        await fetchContacts();
    } catch (error) {
        console.error('Error in update handler:', error);
        showToast(error.message || 'Không thể cập nhật liên hệ', 'error');
    } finally {
        hideLoading();
    }
}

saveContactBtn.addEventListener('click', handleSave);
updateContactBtn.addEventListener('click', handleUpdate);

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = contactsTableBody.getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

document.addEventListener('DOMContentLoaded', () => {
    fetchContacts();
}); 