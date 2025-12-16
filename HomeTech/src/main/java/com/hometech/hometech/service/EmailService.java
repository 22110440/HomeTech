package com.hometech.hometech.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String verificationToken) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject("Xác thực tài khoản HomeTech");

        String verificationLink = "http://localhost:8080/api/auth/verify-email?token=" + verificationToken;

        String htmlContent = """
            <html>
            <body>
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                        <h1 style="color: #007bff;">Chào mừng đến với HomeTech!</h1>
                        <p style="font-size: 16px; color: #333;">Vui lòng click vào nút bên dưới để xác thực email của bạn:</p>
                        <a href="%s" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                            Xác thực Email
                        </a>
                        <p style="font-size: 14px; color: #666; margin-top: 20px;">
                            Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
                        </p>
                        <p style="font-size: 12px; color: #999; margin-top: 20px;">
                            Link xác thực sẽ hết hạn sau 24 giờ.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(verificationLink);

        helper.setText(htmlContent, true);
        mailSender.send(message);
    }

    public void sendPasswordResetEmail(String toEmail, String resetToken) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject("Đặt lại mật khẩu HomeTech");

        // Link về frontend để user có thể đặt lại mật khẩu
        String resetLink = "http://localhost:5173/reset-password?token=" + resetToken;

        String htmlContent = """
            <html>
            <body>
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                        <h1 style="color: #dc3545;">Đặt lại mật khẩu</h1>
                        <p style="font-size: 16px; color: #333;">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản HomeTech của mình.</p>
                        <p style="font-size: 16px; color: #333;">Vui lòng click vào nút bên dưới để đặt lại mật khẩu:</p>
                        <a href="%s" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                            Đặt lại mật khẩu
                        </a>
                        <p style="font-size: 14px; color: #666; margin-top: 20px;">
                            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                        </p>
                        <p style="font-size: 12px; color: #999; margin-top: 20px;">
                            Link đặt lại mật khẩu sẽ hết hạn sau 1 giờ.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(resetLink);

        helper.setText(htmlContent, true);
        mailSender.send(message);
    }

    public void sendMarketingEmail(String toEmail, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }
}
