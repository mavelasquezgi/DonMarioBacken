export const validate = (field: string) => {
    let errors: string[] = ["find","select","drop","update","href","delete","update"]
    let valid: boolean = true
    for (let err in errors) {
        let conten = field.toLowerCase().indexOf(errors[err])
        if (conten != -1) {
            valid = false;
            console.error("valid", valid, err)
        }
    }
    return valid
}