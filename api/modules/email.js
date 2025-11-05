let nodemailer = require("nodemailer");
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');


exports.sendEmail = async (to, subject, message) => {
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        text: message
    }

    await transporter.sendMail(mailOptions);

}

exports.sendResetPasswordEmail = async (to, subject, resetToken, userName) => {
    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;
    const source = fs.readFileSync(path.join(__dirname, 'ForgotPasswordEmail.html'), 'utf8');
    const template = handlebars.compile(source);
    const htmlContent = template({
        userName: userName,
        resetLink: resetURL
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendNewUserEmail = async (to, subject, name, email) => {
    const source = fs.readFileSync(path.join(__dirname, 'NewUser.html'), 'utf8');
    const template = handlebars.compile(source);
    const htmlContent = template({
        newUserName: name,
        newUserEmail: email,
        signInLink: "http://localhost:5173/",

    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendNewRegisterEmail = async (to, subject, name) => {
    const source = fs.readFileSync(path.join(__dirname, 'NewRegister.html'), 'utf8');
    const template = handlebars.compile(source);
    const htmlContent = template({
        userName: name,
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendStoreDetailsUpdateEmail = async (to, subject, updatedStoreDetails) => {
    const source = fs.readFileSync(path.join(__dirname, 'storeDetailsUpdate.html'), 'utf8');
    const template = handlebars.compile(source);
    const htmlContent = template({
        userThatUpdate: updatedStoreDetails?.updatedBy?.name,
        storeName: updatedStoreDetails.storeName,
        storeNumber: updatedStoreDetails.storeNumber,
        storeRegion: updatedStoreDetails.storeRegion,
        storeAddress: updatedStoreDetails.storeAddress,
        storeInspectorName: updatedStoreDetails.storeInspectorName,
        storeInspectorContact: updatedStoreDetails.storeInspectorContact

    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendStoreSurveyUpdateEmail = async (to, subject, updatedSurvey) => {
    const source = fs.readFileSync(path.join(__dirname, 'storeSurveyUpdate.html'), 'utf8');
    const template = handlebars.compile(source);
    const statusLabel =
        updatedSurvey.status === 0 ? "Não iniciado" :
            updatedSurvey.status === 1 ? "Parcial" :
                updatedSurvey.status === 2 ? "Completo" :
                    "Desconhecido";
    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        return `${dia}-${mes}-${ano}`;
    };


    const htmlContent = template({
        userThatUpdate: updatedSurvey?.updatedBy?.name,
        storeName: updatedSurvey?.storeId?.storeName,
        storeNumber: updatedSurvey?.storeId?.storeNumber,
        surveyArea: updatedSurvey.surveyArea,
        surveyCheckoutCount: updatedSurvey.surveyCheckoutCount,
        surveyPhase1Date: formatDate(updatedSurvey.surveyPhase1Date),
        surveyPhase1Type: updatedSurvey.surveyPhase1Type,
        surveyPhase2Date: formatDate(updatedSurvey.surveyPhase2Date),
        surveyPhase2Type: updatedSurvey.surveyPhase2Type,
        surveyOpeningDate: formatDate(updatedSurvey.surveyOpeningDate),
        surveyHeadsets: updatedSurvey.surveyHeadsets,
        surveyHasBread: updatedSurvey.surveyHasBread ? "Sim" : "Não",
        surveyHasChicken: updatedSurvey.surveyHasChicken ? "Sim" : "Não",
        surveyHasCodfish: updatedSurvey.surveyHasCodfish ? "Sim" : "Não",
        surveyHasNewOvens: updatedSurvey.surveyHasNewOvens ? "Sim" : "Não",
        surveyHasFalseCeilling: updatedSurvey.surveyHasFalseCeilling ? "Sim" : "Não",
        surveyMetalFalseCeilling: updatedSurvey.surveyMetalFalseCeilling ? "Sim" : "Não",
        surveyHasElectronicGates: updatedSurvey.surveyHasElectronicGates ? "Sim" : "Não",
        status: statusLabel
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendStoreProvisioningUpdateEmail = async (to, subject, updatedProvisioning) => {
    const source = fs.readFileSync(path.join(__dirname, 'storeProvisioningUpdate.html'), 'utf8');
    const template = handlebars.compile(source);
    const statusLabel =
        updatedProvisioning.status === 0 ? "Não iniciado" :
            updatedProvisioning.status === 1 ? "Parcial" :
                updatedProvisioning.status === 2 ? "Completo" :
                    "Desconhecido";

    const htmlContent = template({
        userThatUpdate: updatedProvisioning?.updatedBy?.name,
        storeName: updatedProvisioning?.storeId?.storeName,
        storeNumber: updatedProvisioning?.storeId?.storeNumber,
        ordered: updatedProvisioning.ordered ? "Sim" : "Não",
        received: updatedProvisioning.received ? "Sim" : "Não",
        validated: updatedProvisioning.validated ? "Sim" : "Não",
        trackingNumber: updatedProvisioning.trackingNumber ? updatedProvisioning.trackingNumber : "Não adicionado",
        status: statusLabel
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendStorePhase1UpdateEmail = async (to, subject, updatedPhase1) => {
    const source = fs.readFileSync(path.join(__dirname, 'storePhase1Update.html'), 'utf8');
    const template = handlebars.compile(source);
    const statusLabel =
        updatedPhase1.status === 0 ? "Não iniciado" :
            updatedPhase1.status === 1 ? "Parcial" :
                updatedPhase1.status === 2 ? "Completo" :
                    "Desconhecido";

    const htmlContent = template({
        userThatUpdate: updatedPhase1?.updatedBy?.name,
        storeName: updatedPhase1?.storeId?.storeName,
        storeNumber: updatedPhase1?.storeId?.storeNumber,
        cablesSalesArea: updatedPhase1.cablesSalesArea ? "Sim" : "Não",
        cablesBakery: updatedPhase1.cablesBakery ? "Sim" : "Não",
        cablesWarehouse: updatedPhase1.cablesWarehouse ? "Sim" : "Não",
        cablesBackoffice: updatedPhase1.cablesBackoffice ? "Sim" : "Não",
        speakersSalesArea: updatedPhase1.speakersSalesArea ? "Sim" : "Não",
        speakersBakery: updatedPhase1.speakersBakery ? "Sim" : "Não",
        speakersWarehouse: updatedPhase1.speakersWarehouse ? "Sim" : "Não",
        speakersBackoffice: updatedPhase1.speakersBackoffice ? "Sim" : "Não",
        status: statusLabel
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendStorePhase2UpdateEmail = async (to, subject, updatedPhase2) => {
    const source = fs.readFileSync(path.join(__dirname, 'storePhase2Update.html'), 'utf8');
    const template = handlebars.compile(source);
    const statusLabel =
        updatedPhase2.status === 0 ? "Não iniciado" :
            updatedPhase2.status === 1 ? "Parcial" :
                updatedPhase2.status === 2 ? "Completo" :
                    "Desconhecido";

    const htmlContent = template({
        userThatUpdate: updatedPhase2?.updatedBy?.name,
        storeName: updatedPhase2?.storeId?.storeName,
        storeNumber: updatedPhase2?.storeId?.storeNumber,
        kls: updatedPhase2.kls ? "Sim" : "Não",
        acrylics: updatedPhase2.acrylics ? "Sim" : "Não",
        hotButtons: updatedPhase2.hotButtons ? "Sim" : "Não",
        amplifier: updatedPhase2.amplifier ? "Sim" : "Não",
        smc: updatedPhase2.smc ? "Sim" : "Não",
        eas: updatedPhase2.eas ? "Sim" : "Não",
        tiko: updatedPhase2.tiko ? "Sim" : "Não",
        quailDigital: updatedPhase2.quailDigital ? "Sim" : "Não",
        ovens: updatedPhase2.ovens ? "Sim" : "Não",
        tests: updatedPhase2.tests ? "Sim" : "Não",
        status: statusLabel
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendStoreCommentCreateEmail = async (to, subject, message, store, userThatCreate) => {
    const source = fs.readFileSync(path.join(__dirname, 'storeCommentCreate.html'), 'utf8');
    const template = handlebars.compile(source);
    const htmlContent = template({
        userThatUpdate: userThatCreate.name,
        storeName: store.storeName,
        storeNumber: store.storeNumber,
        message: message
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendStoreCommentUpdateEmail = async (to, subject, comment, updatedComment) => {
    const source = fs.readFileSync(path.join(__dirname, 'storeCommentUpdate.html'), 'utf8');
    const template = handlebars.compile(source);
    const htmlContent = template({
        userThatUpdate: comment.createdBy.name,
        storeName: comment.storeId.storeName,
        storeNumber: comment.storeId.storeNumber,
        message: updatedComment.message
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}

exports.sendUserApprovedEmail = async (to, subject, userName) => {
    const source = fs.readFileSync(path.join(__dirname, 'UserApproved.html'), 'utf8');
    const template = handlebars.compile(source);
    const htmlContent = template({
        signInLink: "http://localhost:5173/",
        userName: userName,
        
    });

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "LOG",
        to: to,
        subject: subject,
        html: htmlContent
    }

    await transporter.sendMail(mailOptions);

}