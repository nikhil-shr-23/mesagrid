use keyring::Entry;
use thiserror::Error;

const SERVICE_NAME: &str = "mesagrid";

#[derive(Error, Debug)]
pub enum CredentialError {
    #[error("Failed to access keychain: {0}")]
    KeychainError(String),
    #[error("Credential not found")]
    NotFound,
}

/// Store password in OS keychain
pub fn store_password(connection_id: &str, password: &str) -> Result<(), CredentialError> {
    let entry = Entry::new(SERVICE_NAME, connection_id)
        .map_err(|e| CredentialError::KeychainError(e.to_string()))?;
    
    entry
        .set_password(password)
        .map_err(|e| CredentialError::KeychainError(e.to_string()))?;
    
    Ok(())
}

/// Retrieve password from OS keychain
pub fn get_password(connection_id: &str) -> Result<String, CredentialError> {
    let entry = Entry::new(SERVICE_NAME, connection_id)
        .map_err(|e| CredentialError::KeychainError(e.to_string()))?;
    
    entry
        .get_password()
        .map_err(|e| match e {
            keyring::Error::NoEntry => CredentialError::NotFound,
            _ => CredentialError::KeychainError(e.to_string()),
        })
}

/// Delete password from OS keychain
pub fn delete_password(connection_id: &str) -> Result<(), CredentialError> {
    let entry = Entry::new(SERVICE_NAME, connection_id)
        .map_err(|e| CredentialError::KeychainError(e.to_string()))?;
    
    // Ignore error if entry doesn't exist
    let _ = entry.delete_credential();
    
    Ok(())
}
